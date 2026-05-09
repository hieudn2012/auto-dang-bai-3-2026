import { LDProvider as LDProviderComponent } from 'launchdarkly-react-client-sdk';

const context = {
  kind: 'user',
  key: 'EXAMPLE_CONTEXT_KEY',
  email: 'biz@face.dev',
};

export interface Flags {
  REQUIRED_LOGIN: boolean,
  AUTHENTICATION: {
    password: string,
    user: string
  }
}

export const LDProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <LDProviderComponent
      clientSideID="69fe970c38b88b0a950d10ef"
      context={context}
    >
      {children}
    </LDProviderComponent>
  );
};