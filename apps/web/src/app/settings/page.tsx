import { SettingsOpenAIForm } from '../../modules/settings/delivery/ui/SettingsOpenAIForm';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Global settings</p>
        <h1>Settings</h1>
        <p>
          App-level configuration for analysis, accounts, and local workers.
        </p>
      </header>
      <div className={styles.layout}>
        <nav className={styles.rail} aria-label="Settings menu">
          <a href="#openai">OpenAI</a>
        </nav>
        <div className={styles.panel}>
          <SettingsOpenAIForm />
        </div>
      </div>
    </main>
  );
}
