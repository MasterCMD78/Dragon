import { Suspense, lazy } from 'react';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import Home from '@/pages/home';
import About from '@/pages/about';
import Features from '@/pages/features';
import Roadmap from '@/pages/roadmap';
import Faq from '@/pages/faq';
import News from '@/pages/news';
import BlogArticle from '@/pages/blog-article';
import Contact from '@/pages/contact';
import Search from '@/pages/search';
import Privacy from '@/pages/privacy';
import Terms from '@/pages/terms';
import Cookies from '@/pages/cookies';
import Documentation from '@/pages/documentation';
import Support from '@/pages/support';
import NotFound from '@/pages/not-found';

// Admin bundle is lazy-loaded: it's a large CMS panel that only admins ever
// visit, so public visitors (the vast majority of traffic) shouldn't pay for
// it in their initial JS download.
import { AdminAuthProvider } from '@/contexts/admin-auth';
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminUserDetail = lazy(() => import('@/pages/admin/AdminUserDetail'));
const AdminBlog = lazy(() => import('@/pages/admin/AdminBlog'));
const AdminBlogEditor = lazy(() => import('@/pages/admin/AdminBlogEditor'));
const AdminContact = lazy(() => import('@/pages/admin/AdminContact'));
const AdminRoadmap = lazy(() => import('@/pages/admin/AdminRoadmap'));
const AdminAnnouncements = lazy(() => import('@/pages/admin/AdminAnnouncements'));
const AdminContent = lazy(() => import('@/pages/admin/AdminContent'));
const AdminSocialLinks = lazy(() => import('@/pages/admin/AdminSocialLinks'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));

import { useAnalytics } from '@/hooks/use-analytics';
import { AnnouncementOverlay } from '@/components/AnnouncementOverlay';

const AdminFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Wrap each public page in Layout
const PHome = () => <Layout><Home /></Layout>;
const PAbout = () => <Layout><About /></Layout>;
const PFeatures = () => <Layout><Features /></Layout>;
const PRoadmap = () => <Layout><Roadmap /></Layout>;
const PFaq = () => <Layout><Faq /></Layout>;
const PNews = () => <Layout><News /></Layout>;
const PBlogArticle = () => <Layout><BlogArticle /></Layout>;
const PContact = () => <Layout><Contact /></Layout>;
const PSearch = () => <Layout><Search /></Layout>;
const PPrivacy = () => <Layout><Privacy /></Layout>;
const PTerms = () => <Layout><Terms /></Layout>;
const PCookies = () => <Layout><Cookies /></Layout>;
const PDocumentation = () => <Layout><Documentation /></Layout>;
const PSupport = () => <Layout><Support /></Layout>;
const PNotFound = () => <Layout><NotFound /></Layout>;

// Admin wrapper — auth + layout
const AdminPage = ({ children }: { children: React.ReactNode }) => (
  <AdminAuthProvider>
    <Suspense fallback={<AdminFallback />}>
      <AdminLayout>{children}</AdminLayout>
    </Suspense>
  </AdminAuthProvider>
);

function AppContent() {
  useAnalytics();

  return (
    <>
      <AnnouncementOverlay />
      <Switch>
        {/* Admin Login — outside AdminLayout so unauthenticated users can see it */}
        <Route path="/admin/login">
          <AdminAuthProvider>
            <Suspense fallback={<AdminFallback />}>
              <AdminLogin />
            </Suspense>
          </AdminAuthProvider>
        </Route>

        {/* Admin Panel routes */}
        <Route path="/admin/users/:telegramId">
          <AdminPage><AdminUserDetail /></AdminPage>
        </Route>
        <Route path="/admin/blog/new">
          <AdminPage><AdminBlogEditor /></AdminPage>
        </Route>
        <Route path="/admin/blog/:id">
          <AdminPage><AdminBlogEditor /></AdminPage>
        </Route>
        <Route path="/admin/blog">
          <AdminPage><AdminBlog /></AdminPage>
        </Route>
        <Route path="/admin/users">
          <AdminPage><AdminUsers /></AdminPage>
        </Route>
        <Route path="/admin/contact">
          <AdminPage><AdminContact /></AdminPage>
        </Route>
        <Route path="/admin/roadmap">
          <AdminPage><AdminRoadmap /></AdminPage>
        </Route>
        <Route path="/admin/announcements">
          <AdminPage><AdminAnnouncements /></AdminPage>
        </Route>
        <Route path="/admin/content">
          <AdminPage><AdminContent /></AdminPage>
        </Route>
        <Route path="/admin/social-links">
          <AdminPage><AdminSocialLinks /></AdminPage>
        </Route>
        <Route path="/admin/analytics">
          <AdminPage><AdminAnalytics /></AdminPage>
        </Route>
        <Route path="/admin/settings">
          <AdminPage><AdminSettings /></AdminPage>
        </Route>
        <Route path="/admin/dashboard">
          <AdminPage><AdminDashboard /></AdminPage>
        </Route>
        <Route path="/admin">
          <AdminPage><AdminDashboard /></AdminPage>
        </Route>

        {/* Public routes */}
        <Route path="/about" component={PAbout} />
        <Route path="/features" component={PFeatures} />
        <Route path="/roadmap" component={PRoadmap} />
        <Route path="/faq" component={PFaq} />
        <Route path="/news/:slug" component={PBlogArticle} />
        <Route path="/news" component={PNews} />
        <Route path="/contact" component={PContact} />
        <Route path="/search" component={PSearch} />
        <Route path="/privacy" component={PPrivacy} />
        <Route path="/terms" component={PTerms} />
        <Route path="/cookies" component={PCookies} />
        <Route path="/documentation" component={PDocumentation} />
        <Route path="/support" component={PSupport} />
        <Route path="/" component={PHome} />
        <Route component={PNotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AppContent />
    </WouterRouter>
  );
}

export default App;
