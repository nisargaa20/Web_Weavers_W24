import { ChatEngine } from 'react-chat-engine';

import ChatFeed from './components/ChatFeed';
import LoginForm from './components/LoginForm';

import './App.css';

const App = () => {
    if (!localStorage.getItem('username')) return <LoginForm />;
    
  return (
    <ChatEngine
      height="100vh"
      projectID="74757099-3622-4b55-a4f0-7e8deb563b09"
      userName="krupas"
      userSecret="helloworld"
      renderChatFeed={(chatAppProps) => <ChatFeed {...chatAppProps} />}
      />
  );
}

export default App;