import { Routes, Route } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Article from './pages/Article';
import Category from './pages/Category';
import Search from './pages/Search';
import CreateArticle from './pages/CreateArticle';
import EditArticle from './pages/EditArticle';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import AdminSettings from './pages/AdminSettings';
import Setup from './pages/Setup';
import Favorites from './pages/Favorites';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import ApiKeys from './pages/ApiKeys';
import TwoFactorAuth from './pages/TwoFactorAuth';
import RolesManagement from './pages/RolesManagement';
import ImportExport from './pages/ImportExport';
import { treeService } from './services/tree';
import { TreeNode } from './types';

function App() {
  const [tree, setTree] = useState<TreeNode[]>([]);

  const refreshTree = useCallback(() => {
    treeService.getTree().then(setTree).catch(() => {});
  }, []);

  useEffect(() => {
    refreshTree();
  }, []);

  return (
    <>
      <Header />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 120px)' }}>
        <Sidebar tree={tree} onTreeChange={refreshTree} />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/article/:slug" element={<Article />} />
            <Route path="/edit/:id" element={<EditArticle />} />
            <Route path="/category/:slug" element={<Category />} />
            <Route path="/search" element={<Search />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/api-keys" element={<ApiKeys />} />
            <Route path="/2fa" element={<TwoFactorAuth />} />
            <Route path="/roles" element={<RolesManagement />} />
            <Route path="/import-export" element={<ImportExport />} />
            <Route path="/create" element={<CreateArticle />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </>
  );
}

export default App;
