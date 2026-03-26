import Modal from './Modal'
import Login from './Login'

export default function LoginModal({ onClose, onLoginSuccess }) {
  return (
    <Modal onClose={onClose} panelClassName="max-w-lg">
      <Login onClose={onClose} onLoginSuccess={onLoginSuccess} />
    </Modal>
  )
}
