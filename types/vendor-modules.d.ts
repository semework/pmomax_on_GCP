declare module 'mammoth/mammoth.browser.js' {
  const mammoth: {
    extractRawText(argument: { arrayBuffer: ArrayBuffer }): Promise<{ value?: string }>;
  };
  export default mammoth;
}
