export const returnOrSendResponse = (code, responseContent, _req, res) => {
  if (res) {
    res.status(code);
    res.json(responseContent);
    return;
  }
  return {
    code,
    responseContent,
  };
};
