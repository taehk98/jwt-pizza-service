const os = require('os');
const config = require('./config.js');
const MetricBuilder = require('./MetricBuilder')

class Metrics {
  
  constructor() {
    this.requestCounts = {
      GET: 0,
      POST: 0,
      PUT: 0,
      DELETE: 0,
      ALL: 0
    };
    this.latencies = [];
    this.successfulAuthAttempts = 0;
    this.failedAuthAttempts = 0;
    this.buf = new MetricBuilder();
    this.totalOrderAmount = 0;
    this.totalPizzasOrdered = 0;
    this.purchaseFailure = 0;

    this.requestTracker = this.requestTracker.bind(this);
  }

  increaseSuccessfulAuth() {
    this.successfulAuthAttempts += 1;
  }

  increaseFailedAuth() {
    this.failedAuthAttempts += 1;
  }

  decreaseSuccessfulAuth() {
    this.successfulAuthAttempts -= 1;
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }
  
  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

  httpMetrics() {
    for (const [method, count] of Object.entries(this.requestCounts)) {
      this.buf.addMetric('http_requests', method.toLowerCase(), count/60);
    }
    this.requestCounts = {
      GET: 0,
      POST: 0,
      PUT: 0,
      DELETE: 0,
      ALL: 0
    };
  }

  systemMetrics() {
    const cpuUsage = this.getCpuUsagePercentage();
    const memoryUsage = this.getMemoryUsagePercentage();
    this.buf.addMetric('system', 'cpu_usage', cpuUsage);
    this.buf.addMetric('system', 'memory_usage', memoryUsage);
  }

  authMetrics() {
    this.buf.addMetric('auth_attempts_per_minute', 'success', this.successfulAuthAttempts/60)
    this.buf.addMetric('auth_attempts_per_minute', 'failure', this.failedAuthAttempts/60)
    this.successfulAuthAttempts = 0;
    this.failedAuthAttempts = 0;
  }

  latencyMetrics() {
    // let formattedMetric = `Request_latency,source=${config.metrics.source} ms=${this.latency}`;
    // this.sendMetricToGrafana(formattedMetric);
    const avgLatency = this.latencies.reduce((sum, latency) => sum + latency, 0) / this.latencies.length;
    this.buf.addMetric('Request_Latency', 'ms', avgLatency);
    this.latencies = [];
  }

  purchaseMetrics() {
    this.buf.addMetric('Pizza_purchases', 'sold', this.totalPizzasOrdered/60);
    this.buf.addMetric('Pizza_purchases', 'purchase_failure', this.purchaseFailure/60);
    this.buf.addMetric('Revenue', 'revenue', this.totalOrderAmount/60);
    this.totalPizzasOrdered = 0;
    this.purchaseFailure = 0;
    this.totalOrderAmount = 0;
  }
  
  
  sendMetricsPeriodically(period) {
    setInterval(() => {
      try {
        this.buf = new MetricBuilder();
        this.httpMetrics();
        this.systemMetrics();
        // this.userMetrics();
        this.purchaseMetrics();
        this.authMetrics();
        this.latencyMetrics();
  
        const metrics = this.buf.toString('\n');
        console.log('Sending metrics:', typeof(metrics));
        this.sendMetricToGrafana(metrics);
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, period);
  }
  
  sendMetricToGrafana(metrics) {
    const metricArray = metrics.split('\n');
    metricArray.forEach(metric => {
      fetch(`${config.metrics.url}`, {
        method: 'post',
        body: metric,
        headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
      })
        .then((response) => {
          if (!response.ok) {
            console.error('Failed to push metric data to Grafana');
            console.error(metric);
            console.error(`Status: ${response.status}`);
            console.error(response.statusText);
          } else {
            console.log(`Pushed ${metric}`);
          }
        })
        .catch((error) => {
          console.error('Error pushing metric:', error);
        });
    });
  }

  requestTracker(req, res, next) {
    const start = Date.now();
    if (Object.prototype.hasOwnProperty.call(this.requestCounts, req.method)) {
      this.requestCounts[req.method] += 1;
      this.requestCounts['ALL'] += 1;
    }
    if (req.path === '/api/auth' && req.method === 'PUT') {
      this.increaseSuccessfulAuth();
    }

    if (req.path === '/api/order' &&  req.method === 'POST'){
      const items = req.body.items || [];
      let totalAmount = 0;
      let totalPizzas = 0;

      items.forEach(item => {
        totalPizzas += 1; 
        totalAmount += item.price; 
      });

      this.totalOrderAmount = (this.totalOrderAmount || 0) + totalAmount;
      this.totalPizzasOrdered = (this.totalPizzasOrdered || 0) + totalPizzas;
    }
    res.on('finish', () => {
      this.latencies.push(Date.now() - start)
      console.log(`Request latency for ${req.method} ${req.url}: ${this.latencies[this.latencies.length-1]}ms`);
      if (res.statusCode === 200) {
        console.log('Order processed successfully');
      } else {
        if (req.path === '/api/order' &&  req.method === 'POST'){
          this.purchaseFailure = (this.failedRequests || 0) + 1;
          console.log(`Order failed. Total failures: ${this.purchaseFailure}`);
        }
      }
    });
    
    next();
  }
}

module.exports = Metrics