import Feed from '../components/Feed';
import { CommunitiesSidebar, TrendingSidebar } from '../components/Sidebar';
import PropTypes from 'prop-types';
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

const idType = PropTypes.oneOfType([PropTypes.string, PropTypes.number]);

HomePage.propTypes = {
  user: PropTypes.shape({ id: idType.isRequired }).isRequired,
  searchQuery: PropTypes.string,
  selectedCommunities: PropTypes.arrayOf(idType),
  setSelectedCommunities: PropTypes.func.isRequired,
  communities: PropTypes.arrayOf(PropTypes.object),
  onPostClick: PropTypes.func,
};

