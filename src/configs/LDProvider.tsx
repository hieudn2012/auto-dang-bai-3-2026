import { LDProvider as LDProviderComponent } from 'launchdarkly-react-client-sdk';

const context = {
  kind: 'user',
  key: 'EXAMPLE_CONTEXT_KEY',
  email: 'biz@face.dev',
};

export interface Flags {
  required_login: boolean,
  authentication: {
    password: string,
    user: string
  },
  config: boolean,
  profile: boolean,
  tools: boolean,
  schedule: boolean,
  report: boolean,
  logs: boolean,
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