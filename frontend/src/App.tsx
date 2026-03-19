import './App.css';
import { RegistrationForm } from './components/RegistrationForm';
import { FacilitatorQueue } from './components/FacilitatorQueue';
import { CommunityHub } from './components/CommunityHub';

function App() {
  return (
    <main className="layout">
      <header className="hero">
        <div>
          <p className="eyebrow">Hustle Economy · KwaZulu-Natal</p>
          <h1>Connect hustlers, facilitators, and communities in one marketplace.</h1>
          <p className="muted">
            Register your hustle, get verified by local facilitators, and showcase your products/services inside community hubs.
            This MVP wires up the forms, approval flow, and marketplace browsing that will power the Hustle Economy roadmap.
          </p>
        </div>
      </header>
      <RegistrationForm />
      <FacilitatorQueue />
      <CommunityHub />
    </main>
  );
}

export default App;
