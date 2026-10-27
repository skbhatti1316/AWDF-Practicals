const NodeCache = require("node-cache");

// Shared in-memory cache with a 60-second TTL
const cache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
});

module.exports = cache;