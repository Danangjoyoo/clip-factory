import { SettingsOpenAIForm } from '../../modules/settings/delivery/ui/SettingsOpenAIForm';

export default function SettingsPage() {
  return (
    <main>
      <h1>Settings</h1>
      <nav aria-label="Settings menu">
        <a href="#openai">OpenAI</a>
      </nav>
      <SettingsOpenAIForm />
    </main>
  );
}
