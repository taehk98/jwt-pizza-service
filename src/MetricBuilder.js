const config = require('./config.js')
class MetricBuilder {
  constructor() {
    this.metrics = [];
  }

  addMetric(prefix, name, value, optional=null) {
    const metric = { prefix, name, value };
    if (optional !== null) {
      metric.optional = optional;
    }
    this.metrics.push(metric);
  }

  toString(separator = '\n') {
    return this.metrics
      .map(metric => {
        const { prefix, name, value, optional } = metric;
        let formattedMetric = `${prefix}.${name}=${value}`;

        formattedMetric += `,source=${config.metrics.source}`;
        
        if (optional) {
          for (const [key, val] of Object.entries(optional)) {
            formattedMetric += `,${key}=${val}`;
          }
        }
        
        return formattedMetric;
      })
      .join(separator);
  }
}

module.exports = MetricBuilder;