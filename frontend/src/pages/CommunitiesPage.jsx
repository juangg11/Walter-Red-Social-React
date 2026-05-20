import Communities from '../components/Comunidades';
import styles from '../App.module.css';

export default function CommunitiesPage({ user, onCommunityCreated }) {
  return (
    <main className={styles.pageShell}>
      <Communities user={user} onCommunityCreated={onCommunityCreated} />
    </main>
  );
}

