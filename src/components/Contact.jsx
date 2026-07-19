import { useState } from 'react'

function Contact() {
  const [message, setMessage] = useState('')

  return (
    <section>
      <h1>Siddharth Kalpeshkumar Bhatti</h1>

      <p>
        <strong>Mobile:</strong> 9016931339
      </p>

      <p>
        <strong>Email:</strong>{' '}
        <a href="mailto:skbhatti1316@gmail.com">
          skbhatti1316@gmail.com
        </a>
      </p>

      <hr />

      <label htmlFor="message">Send me a message:</label>
      <br />

      <input
        id="message"
        type="text"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Type your message"
      />

      <p>Live message: {message}</p>
      <p>Character count: {message.length}</p>
    </section>
  )
}
export default Contact