import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Base React App</h1>
      <button onClick={() => setCount((c) => c + 1)}>
        Count is {count}
      </button>
    </div>
  );
}

export default App;
