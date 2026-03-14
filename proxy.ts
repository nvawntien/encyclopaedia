import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
 
export default createMiddleware(routing);
 
export const config = {
  // Match only internationalized pathnames
  // Improved matcher to catch all relevant paths and exclude assets/api
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
