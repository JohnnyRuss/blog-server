type SendForgotPasswordPinArgsT = {
  to: string;
  pin: number;
  username: string;
};

type SendWelcomeArgsT = {
  to: string;
  username: string;
};

export type { SendForgotPasswordPinArgsT, SendWelcomeArgsT };
