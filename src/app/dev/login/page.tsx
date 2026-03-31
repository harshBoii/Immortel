import { notFound } from 'next/navigation';
import DevLoginClient from './dev-login-client';

export default function DevLoginPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }
  return <DevLoginClient />;
}
