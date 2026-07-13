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
import NotFound from '@/pages/not-found';

// Admin imports
import { AdminAuthProvider } from '@/contexts/admin-auth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminUserDetail from '@/pages/admin/AdminUserDetail';
import AdminBlog from '@/pages/admin/AdminBlog';
import AdminBlogEditor from '@/pages/admin/AdminBlogEditor';
import AdminContact from '@/pages/admin/AdminContact';
import AdminRoadmap from '@/pages/admin/AdminRoadmap';
import AdminAnnouncements from '@/pages/admin/AdminAnnouncements';
import AdminContent from '@/pages/admin/AdminContent';
import AdminSocialLinks from '@/pages/admin/AdminSocialLinks';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';
import AdminSettings from '@/pages/admin/AdminSettings';

import { useAnalytics } from '@/hooks/use-analytics';
import { AnnouncementOverlay } from '@/components/AnnouncementOverlay';

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
const PNotFound = () => <Layout><NotFound /></Layout>;

// Admin wrapper — auth + layout
const AdminPage = ({ children }: { children: React.ReactNode }) => (
  <AdminAuthProvider>
    <AdminLayout>{children}</AdminLayout>
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
            <AdminLogin />
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
