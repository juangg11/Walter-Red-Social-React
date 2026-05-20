import Feed from '../components/Feed';
import { CommunitiesSidebar, TrendingSidebar } from '../components/Sidebar';
import styles from '../App.module.css';

export default function HomePage({ user, searchQuery, selectedCommunities, setSelectedCommunities, communities, onPostClick }) {
  return (
    <main className={styles.mainContent}>
      <CommunitiesSidebar
        communities={communities}
        selectedCommunities={selectedCommunities}
        onSelectCommunities={setSelectedCommunities}
      />
      <Feed
        user={user}
        searchQuery={searchQuery}
        selectedCommunities={selectedCommunities}
        communities={communities}
      />
      <TrendingSidebar onPostClick={onPostClick} />
    </main>
  );
}

