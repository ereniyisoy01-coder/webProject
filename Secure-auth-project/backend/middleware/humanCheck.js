function humanCheck(req, res, next) {
 
  const startTime = req.body.startTime;
  const endTime = Date.now();
 
  const diff = endTime - startTime;
 
  // allow 1.5 seconds minimum instead of 3
  if (!startTime || diff < 1500) {
    return res.status(400).json({
      message: "Bot detected (too fast submission)"
    });
  }
 
  next();
}
 
module.exports = humanCheck;