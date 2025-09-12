  export type Message = {
    message: string;
    userId: string;
    userName: string;
  }

  export interface Messages {
    messages: Array<Message>;
  }