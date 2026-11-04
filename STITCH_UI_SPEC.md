# PCForge UI inventory and Stitch brief

This brief is based on the Django/DRF code currently in the repository. It describes a prototype UI that can be backed by the existing API; it does not assume features or fields that the backend does not provide.

## Backend inventory

### Models and displayable data

- **Account (`accounts.CustomUser`)** extends Django `AbstractUser` without added fields. The application can rely on username and standard Django account fields, but there is no dedicated profile model, avatar, phone, address, saved payment method, or profile-edit API.
- **Category (`components.Category`)**: `id`, `name`, `slug`.
- **Component (`components.Component`)**: name, brand, category, socket, RAM type (DDR4/DDR5), TDP, required PSU power, form factor, average price, optional image, description, created/updated timestamps.
- **Marketplace listing (`marketplace.Listing`)**: seller, component, asking price, condition (new/used), active state, description, created/updated timestamps. Serializer embeds component and seller username.
- **Build (`builder.Build`)**: owner, title, public flag, timestamps, items, computed compatibility errors. Each **BuildItem** has a component and quantity. No build total, benchmark, wattage estimate, or public-build discovery endpoint is implemented.
- **ChatRoom (`chat.ChatRoom`)**: optional listing, buyer, seller, created timestamp. **Message**: sender, text, created timestamp, `is_read`. A room serializer includes the listing and all messages.
- The separate `build` Django app is an empty scaffold; builder functionality is in `builder`.

### HTTP API routes

All API routes are rooted at `/api/`.

| Route | Operations / purpose | UI use |
|---|---|---|
| `/auth/register/` | POST username/password | Sign up |
| `/auth/login/` | POST username/password; returns JWT access/refresh | Sign in |
| `/auth/token/refresh/` | POST refresh token | Renew session |
| `/auth/logout/` | POST refresh token; blacklist | Sign out |
| `/components/categories/` | GET list/detail | Category navigation/filter options |
| `/components/components/` | GET list/detail; filter category/socket/ram_type/form_factor, search name/brand/description | Catalog and builder picker |
| `/marketplace/listings/` | GET list/detail; POST create; PUT/PATCH update; DELETE; filter component/condition/is_active, search component name/brand/description, order price/created_at | Marketplace, listing detail, seller listing management |
| `/builder/builds/` | Authenticated list/create/retrieve/update/delete; users only see their own builds | My builds and build editor |
| `/builder/builds/{id}/add_item/` | POST component_id and quantity | Add/replace a component in a build |
| `/builder/builds/{id}/remove_item/` | DELETE with component_id | Remove a component |
| `/chat/rooms/` | Authenticated list/create/retrieve/update/delete; rooms for buyer or seller | Inbox and conversation context |
| `/chat/rooms/{id}/messages/` | GET message history; POST `{text}` sends a message | Conversation |
| `ws/chat/{room_id}/?token={access}` | Authenticated WebSocket sends and receives live messages | Live conversation updates |
| `/schema/`, `/docs/`, `/redoc/` | OpenAPI, Swagger UI, ReDoc | Developer-facing only |

DRF routers also expose the standard list/detail methods for their viewsets. Components/categories are read-only. Listing POST requires authentication; listing `seller` is assigned from the current user. Builds and chats require authentication. A new chat room is created from a listing; seller is derived from that listing.

### Existing server-rendered page routes

`/`, `/builder/`, `/chat/`, and `/parts/<listing_id>/` point to Django `TemplateView`s named marketplace, builder, chat, and product_detail. Their template files are not present in the repository. These routes establish only a minimal shell; page behavior should be driven by the APIs above.

## Required application screens

| Screen | Backend data and interactions |
|---|---|
| **1. Marketplace / discover** (`/`) | Listing cards from `GET /api/marketplace/listings/`: component image/name/brand/category, listing price, condition, seller username, active state, listing id. Category filters from `/api/components/categories/`; search, category/component and condition filters, price/date sorting supported. Include a “Build a PC” entry point. Do not present checkout/cart functionality: none exists. |
| **2. Listing detail** (`/parts/:listing_id/`) | Listing detail with embedded component, seller username, condition, price, description, active state and timestamps; show component specs/image. Primary actions: start/contact seller by POSTing a room to `/api/chat/rooms/` with `listing_id`; add component to a build (requires sign-in and a selected build). |
| **3. Component catalog / picker** (standalone route or builder modal/drawer) | Component data from `/api/components/components/` and categories. Search by name/brand/description and filter by category, socket, RAM type, form factor. Show image, brand, category, price_avg, socket, RAM type, TDP, PSU requirement, form factor. Component endpoints have no pagination/filter for price or stock; no inventory quantity is modeled. |
| **4. PC builder / build editor** (`/builder/`) | Authenticated user’s builds via `/api/builder/builds/`; create/edit title and `is_public`; build items with nested component info and quantity. Picker adds items through `add_item`, removal through `remove_item`. Display `compatibility_errors` beside the selected parts. Show an estimated parts subtotal only if the client computes the sum of `price_avg × quantity`, clearly label it as an estimate, not a server total. |
| **5. My builds** (can be the builder’s initial state) | Build title, public/private status, created/updated timestamps, part count from `items`, and compatibility state. Data is limited to the authenticated user’s builds. No browse-public-builds API exists. |
| **6. Sign in** | Username/password to `/api/auth/login/`; retain access and refresh tokens client-side for protected interactions. |
| **7. Create account** | Username/password to `/api/auth/register/`. There are no email or profile fields in the registration serializer. |
| **8. Messages inbox** (`/chat/`) | Rooms from `/api/chat/rooms/`; display counterpart username (choose seller/buyer based on current user), listing context, room creation date, and latest message preview/unread indicator derived from messages. The serializer exposes messages but there is no dedicated unread count or last-message field. |
| **9. Conversation** (room selected in `/chat/`) | Listing context, counterpart username, chronological messages, sender, timestamp, read flag, text input. Load history from `/messages/`, send via POST, and connect to WebSocket for live updates using access token query parameter. Support empty room and connection/reconnect states. |
| **10. Account menu / lightweight account screen** | Username and standard account session actions (sign out via `/api/auth/logout/`). Present a minimal identity panel. Do not invent editable profile/contact information; there is no profile read/update endpoint. |

### Backend constraints the prototype should respect

- There is no separate product model: marketplace products are listings of components. One component may have multiple listings.
- A component record has `price_avg`; the actual seller listing has a separate asking `price` and condition.
- No cart, checkout, payment, shipping, reviews, favorites, notifications, user avatar, profile editing, or seller storefront API is implemented.
- Builds are private to their owner in the current API despite the `is_public` flag. Do not add a public gallery unless the backend is extended.
- Compatibility checks are rule-based and currently identify key parts by Russian category names (`процессор`, `материнская плата`, `видеокарта`, `бп`, `озу`). The messages are Russian. A UI can show returned warnings as-is or translate known messages client-side, but should not promise broad compatibility coverage.
- Chat exposes `is_read`, but no endpoint currently marks messages read. The WebSocket consumer accepts a `message` payload and broadcasts sender/timestamp; HTTP messages use `{text}`.
- Standard list endpoints do not declare pagination in this project. Design graceful loading, empty, error, and long-list states without assuming a particular page-number response shape.

## Shared visual direction for Stitch

Create a polished desktop-first responsive web app called **PCForge**, for building PCs and buying/selling components. Use a restrained, minimalist dark interface: near-black/charcoal surfaces, soft elevated panels, subtle borders, clear typography, generous spacing, and one electric lime or cool cyan accent used sparingly for primary actions and status. Keep product photography/component images prominent and use consistent spec chips, badges, and iconography. Avoid neon glow, dense gamer HUD styling, excessive gradients, and decorative dashboards.

Use a consistent top navigation with PCForge wordmark, Marketplace, PC Builder, Messages, and a right-side account/sign-in control. On mobile, collapse links into a compact menu and make primary actions reachable. Use a centered content grid with a comfortable max width, consistent spacing, accessible contrast, visible keyboard focus, and clear hierarchy. Reuse buttons, inputs, search, filter chips, select menus, cards, status badges, modal/drawer patterns, empty states, and skeleton loading states across screens. Build a coherent component system, not unrelated page mockups.

Do not invent backend fields. Use realistic placeholder data only to make the visual prototype legible. Clearly distinguish marketplace asking prices from catalog average prices, and show unavailable actions in a disabled or sign-in-required state. Include empty, loading, and validation states where the page requires data or authentication.

## Stitch prompt set

### Prompt 1 — shared app shell and visual system

> Design a clean, minimalist dark responsive web application named PCForge for PC component discovery, PC building, and peer-to-peer component listings. Establish a reusable design system and app shell. Use a charcoal-black background, layered dark-gray surfaces, subtle 1px borders, readable modern sans-serif typography, and a single restrained lime or cool-cyan accent. Make component imagery clear and realistic. Use a fixed or sticky top bar with PCForge logo, Marketplace, PC Builder, Messages, and account/sign-in control. Define reusable buttons, inputs, select controls, filter chips, component cards, listing cards, spec badges, status badges, dialogs/drawers, toast feedback, skeletons, and empty/error states. Desktop-first but responsive; accessible contrast and keyboard focus. Keep it calm and precise; avoid neon glow, gamer HUD styling, and clutter. Backend model fields available: components have name, brand, category, optional image, description, average price, socket, RAM type, TDP, PSU requirement, form factor; listings add seller username, asking price, new/used condition, active state and description. There are no cart, checkout, reviews, favorites, profile fields, or payment features. Generate a consistent UI kit and shell that can be reused across all following screens.

### Prompt 2 — marketplace and listing detail

> Using the established PCForge dark design system, create two connected screens. **Marketplace:** top app navigation; page heading and concise intro; prominent search field; category navigation/filter; condition filter; sort by newest or price; responsive listing card grid. Each card shows component image, brand and name, category, asking price, new/used badge, seller username, and a clear details action. Add loading, no-results, and signed-out states. **Listing detail:** large product image/gallery area, title and brand, category and component specification chips (socket, RAM type, TDP, form factor, PSU requirement), seller listing price and condition, seller username, listing description, and actions “Message seller” and “Add to build.” Keep listing asking price distinct from average catalog price. The backend has no cart or checkout, so do not show purchase/payment flows. Show sign-in-required states for protected actions. Use realistic placeholder data without implying availability counts or reviews.

### Prompt 3 — component catalog and builder picker

> Create the PCForge component catalog as a searchable/filterable page and a compact picker drawer variant, using the same restrained dark theme. Include search by component name or brand, category selector, socket, RAM type, and form factor filters. Use a dense but readable table/list on desktop and cards on mobile. Each result should show optional component image, name, brand, category, catalog average price, socket, RAM type, TDP, required PSU power, and form factor, with a “Select component” action in picker mode. Include clear active filter chips, reset filters, loading, empty, and error states. Do not show stock, delivery, discount, or seller price here: component catalog data only provides average price and specifications.

### Prompt 4 — PC builder and my builds

> Design the PCForge authenticated builder workspace plus a “My builds” overview. In the builder, show build title editable in place, public/private toggle, and a vertical component category/parts list with selected items, quantities, component name, average price, key specs, and remove action. Add a component-picker drawer/modal with category filters and search. Put a compatibility panel beside the build list, showing backend-returned warnings/errors in clear amber/red/green states. Provide an estimated subtotal computed from average component prices and label it explicitly as an estimate. Include save/create-build actions and sign-in-required, empty build, loading, and error states. My builds cards show title, privacy state, item count, last updated date, compatibility status, and “Continue building.” The API returns only the signed-in owner’s builds; do not create a public build gallery, performance scores, benchmarks, or guaranteed wattage estimates. Compatibility checks are limited; present them as warnings, not exhaustive certification.

### Prompt 5 — authentication and account menu

> Create matching PCForge sign-in, create-account, and compact account-menu states. Keep forms centered in a calm dark panel with logo, short heading, username and password inputs, show/hide password, inline validation, submit/loading feedback, and links between sign-in and registration. Registration asks for username and password only. The account menu shows the current username and a sign-out action. Do not add email, avatar upload, biography, phone, address, social sign-in, or editable profile screens because the backend does not support them. Preserve the shared app navigation and accessible focus/error states.

### Prompt 6 — messages inbox and conversation

> Create the PCForge messaging experience in the shared dark visual system. The inbox layout has a room list with counterpart username, associated listing/component context, last message preview derived from available message history, and date; the larger pane shows a helpful empty selection state. The conversation view has a compact header with the counterpart username and listing summary, chronological message bubbles with sender and timestamp, read-state styling where available, and a message composer with send action. Include initial loading, no conversations, empty new room, send failure, and reconnecting live connection states. Rooms may be buyer/seller chats tied to a listing; show the related component/listing when available. Do not imply attachments, read receipts being updated, online presence, notifications, or search because those features are not implemented. Use responsive split-pane desktop layout and a navigable stacked layout on mobile.

## Suggested generation order

1. Generate the shared design system and app shell.
2. Generate marketplace and listing detail.
3. Generate catalog/picker and builder.
4. Generate authentication and messaging.
5. Ask Stitch to apply the same tokens, spacing, navigation, and components consistently across all screens and provide mobile variants.

