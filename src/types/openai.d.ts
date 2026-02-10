declare module 'openai' {
  export class OpenAI {
    constructor(options?: any);
    responses: {
      create(args: any): Promise<any>;
    };
  }
}
