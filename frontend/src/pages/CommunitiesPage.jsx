import Communities from '../components/Comunidades';
import PropTypes from 'prop-types';
import styles from '../App.module.css';

export default function CommunitiesPage({ user, onCommunityCreated }) {
  return (
    <main className={styles.pageShell}>
      <Communities user={user} onCommunityCreated={onCommunityCreated} />
    </main>
  );
}

CommunitiesPage.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
  onCommunityCreated: PropTypes.func,
};

