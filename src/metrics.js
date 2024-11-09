const os = require('os');
const config = require('./config.js');
const MetricBuilder = require('./MetricBuilder')

class Metrics {
  
  constructor() {
    this.requestCounts = {
      GET: 0,
      POST: 0,
      PUT: 0,
      DELETE: 0
    };
    this.latency = 0;
    this.successfulAuthAttempts = 0;
    this.failedAuthAttempts = 0;
    this.buf = new MetricBuilder();

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
      this.buf.addMetric('http_requests', method.toLowerCase(), count, { unit: 'count/minute' });
    }
  }

  systemMetrics() {
    const cpuUsage = this.getCpuUsagePercentage();
    const memoryUsage = this.getMemoryUsagePercentage();
    this.buf.addMetric('system', 'cpu_usage', cpuUsage, { unit: 'percent' });
    this.buf.addMetric('system', 'memory_usage', memoryUsage, { unit: 'percent' });
  }

  authMetrics() {
    this.buf.addMetric('auth_attempts_per_minute', 'success', this.successfulAuthAttempts, { unit: 'count/minute'})
    this.buf.addMetric('auth_attempts_per_minute', 'failure', this.failedAuthAttempts,  { unit: 'count/minute'})
    this.successfulAuthAttempts = 0;
    this.failedAuthAttempts = 0;
  }
  
  sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      try {
        // this.buf = new MetricBuilder();
        this.httpMetrics();
        this.systemMetrics();
        // this.userMetrics();
        // this.purchaseMetrics();
        this.authMetrics();
  
        const metrics = this.buf.toString('\n');
        this.sendMetricToGrafana(metrics);
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, period);
  }
  
  sendMetricToGrafana(metrics) {
    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metrics,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.error('Failed to push metrics data to Grafana');
        } else {
          console.log(`Pushed ${metrics}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }

  requestTracker(req, res, next) {
    const start = Date.now();
    if (this.requestCounts.hasOwnProperty(req.method)) {
      this.requestCounts[req.method] += 1;
    }
    if (req.path === '/api/auth' && req.method === 'PUT') {
      this.increaseSuccessfulAuth();
    }

    res.on('finish', () => {
      this.latency = Date.now() - start;
      console.log(`Request latency for ${req.method} ${req.url}: ${this.latency}ms`);
    });
    
    next();
  }
}

module.exports = Metrics