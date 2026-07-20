import jwt from 'jsonwebtoken';

// Simulate what the login does
const secret = process.env.JWT_SECRET || 'dev-secret';
console.log('JWT_SECRET used:', secret);

const token = jwt.sign(
  { id: '3520d1c7-a4ea-4c58-aa32-734ab4e9aa96', username: 'admin', role: 'admin' },
  secret,
  { expiresIn: '7d' }
);

console.log('Generated token:', token.substring(0, 50) + '...');

// Now verify it
try {
  const decoded = jwt.verify(token, secret);
  console.log('Token verified OK:', decoded);
} catch (err) {
  console.error('Token verification FAILED:', err);
}
