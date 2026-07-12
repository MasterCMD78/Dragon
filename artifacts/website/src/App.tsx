import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import Home from '@/pages/home';
import About from '@/pages/about';
import Features from '@/pages/features';
import Roadmap from '@/pages/roadmap';
import Faq from '@/pages/faq';
import News from '@/pages/news';
import Contact from '@/pages/contact';
import NotFound from '@/pages/not-found';

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route path="/features" component={Features} />
          <Route path="/roadmap" component={Roadmap} />
          <Route path="/faq" component={Faq} />
          <Route path="/news" component={News} />
          <Route path="/contact" component={Contact} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </WouterRouter>
  );
}

export default App;