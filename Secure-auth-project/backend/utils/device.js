function getDevice(req) {

  if (req.body.deviceId) {
    return req.body.deviceId;
  }

  return req.headers["user-agent"];
}

module.exports = { getDevice };