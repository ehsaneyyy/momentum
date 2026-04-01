# Momentum Frontend

A modern, event-driven web application for spontaneous social connections built with vanilla JavaScript, Tailwind CSS, and Three.js.

## Features

- **Real-time Events**: Browse and join spontaneous events
- **Interactive Maps**: View event locations with Mapbox GL
- **Live Chat**: Communicate with event participants via WebSocket
- **3D Background**: Immersive animated particle background
- **Authentication**: Secure login and signup with JWT tokens
- **User Profiles**: Manage your account and created events
- **Responsive Design**: Mobile-first responsive layout

## Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Backend API running on `http://localhost:8000`
- Mapbox API token (optional, for map features)

## Setup

### 1. Configure API Base URL

Edit `js/config.js` to set your API endpoint:

```javascript
export const API_CONFIG = {
    BASE_URL: process.env.API_BASE_URL || 'http://localhost:8000',
    // ...
};
```

For production, set the `API_BASE_URL` environment variable.

### 2. Configure Mapbox Token

Option A: Set token in `index.html` (recommended for development):
```html
<script>
    window.MAPBOX_TOKEN = 'your_mapbox_token_here';
</script>
```

Option B: Set via environment variable:
```bash
export MAPBOX_TOKEN=your_token
```

Get a free token at: https://www.mapbox.com/

### 3. Start Development Server

```bash
# Simple HTTP server (Python 3)
python -m http.server 8080

# Or with npm
npx http-server
```

Visit `http://localhost:8080` in your browser.

## Project Structure

```
├── index.html           # Main HTML file with modals and layout
├── css/
│   └── styles.css      # Custom animations and utilities
├── js/
│   ├── main.js         # Core application logic
│   ├── config.js       # Configuration and constants
│   ├── utils.js        # Validation and UI utilities
│   └── package.json    # Frontend dependencies (if using npm)
└── assets/             # Images and static files
```

## Key Features

### Authentication
- Login with username and password
- Sign up with email, username, and password
- JWT token stored in localStorage
- Automatic session refresh on page load

### Event Management
- Create events with title, description, location, and participant limit
- View all events or filter by your events/joined events
- Join public events or leave after joining
- Delete events you created
- Real-time participant count updates

### Location Mapping
- Click on the map to set event location
- Visual marker for selected location
- Coordinates sent to backend

### Real-time Chat
- WebSocket-based live chat for event participants
- Message history preserved in database
- User information included with messages
- Connection error handling

### Form Validation
- Username validation (3-20 chars, alphanumeric)
- Email format validation
- Password minimum length (6 chars)
- Event details validation before submission
- Clear error messages for failed validation

### User Experience
- Loading indicators during API calls
- Success/error notifications
- Responsive form error handling
- Button loading states
- Professional error messages
- Auto-dismiss notifications

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/token` | Login (returns JWT token) |
| POST | `/users/signup` | Create account |
| GET | `/users/me` | Get current user info |
| GET | `/events` | List all events |
| POST | `/events` | Create new event |
| POST | `/events/{id}/join` | Join event |
| POST | `/events/{id}/leave` | Leave event |
| DELETE | `/events/{id}` | Delete event |
| POST | `/events/{id}/messages` | Post chat message |
| WS | `/ws/chat/{id}` | WebSocket for live chat |

## WebSocket Chat Protocol

### Message Format
```json
{
    "message": "Hello everyone!",
    "username": "john_doe"
}
```

### Broadcasting
Messages sent via WebSocket are automatically broadcast to all connected clients for that event.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `http://localhost:8000` | Backend API URL |
| `MAPBOX_TOKEN` | `YOUR_MAPBOX_TOKEN_HERE` | Mapbox API token |

## Styling

The application uses:
- **Tailwind CSS** for utility-first styling
- **Custom CSS** for animations and advanced effects
- **CSS animations** for smooth interactions
- **Backdrop blur** for modern glass-morphism effects

### Custom Classes
- `.bounce` - Message bounce animation
- `.pulse` - Button pulse animation
- `.fade-out` - Card deletion transition
- `.event-card-joined` - Visual indicator for joined events

## Performance Optimizations

- Lazy loading of event details
- Efficient DOM querying with IDs
- CSS animations for smooth 60fps transitions
- WebSocket reuse to reduce connections
- LocalStorage for token persistence

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires ES6 module support.

## Troubleshooting

### API Connection Failed
1. Ensure backend is running on `http://localhost:8000`
2. Check `API_CONFIG.BASE_URL` in `js/config.js`
3. Verify CORS is enabled on backend

### Map Not Showing
1. Check Mapbox token is set in `index.html`
2. Visit https://account.mapbox.com to verify token
3. Check browser console for errors

### Chat Not Connecting
1. Verify WebSocket URL in `js/config.js`
2. Check backend WebSocket endpoint is available
3. Test with `wscat` or similar tool

### Login Not Working
1. Verify credentials are correct
2. Check backend authentication endpoint
3. Clear localStorage and try again: `localStorage.clear()`

## Development Tips

- Use browser DevTools to inspect network requests
- Check localStorage for JWT token: `localStorage.getItem('access_token')`
- Monitor WebSocket in Network tab
- Use console for debugging: `console.log()`

## Contributing

To contribute improvements:
1. Create a feature branch
2. Make your changes
3. Test thoroughly in multiple browsers
4. Submit a pull request

## License

See LICENSE file in repository.

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review browser console for errors
2. Contact the development team

---

**Last Updated**: March 31, 2026
**Version**: 1.0.0-professional
