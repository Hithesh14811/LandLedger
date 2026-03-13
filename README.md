# LandLedger | Government Property Management

LandLedger is a Next-Generation Digital Land Registry Prototype built with React, Vite, and TypeScript. It serves as a secure, role-based platform for managing, verifying, and transferring property records using cryptographic verification and geospatial risk analysis.

## 🚀 Features

- **Role-Based Access**: Specialized dashboards for standard Users and Government Authorities.
- **Property Management**: Register, transfer, and subdivide land properties.
- **Cryptographic Ledger**: Simulates a secure, verifiable ledger for all property transactions using cryptographic hashes.
- **Geospatial Tools**: Integrated with Turf.js for property boundary validation.
- **Risk Analysis**: Built-in risk engine for verifying property credibility and compliance.

## 🛠️ Technology Stack

- **Frontend Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Geospatial Analysis**: Turf.js
- **Cryptography**: crypto-js, ethers
- **Icons**: Lucide React

## 📦 Getting Started

Follow these step-by-step instructions to set up the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (Node Package Manager)

### 1. Repository Setup

If you haven't already, clone or navigate to the repository on your local machine:
```bash
git clone <repository-url>
cd Cyanide_boys
```

### 2. Install Dependencies

Run the following command to install all required packages defined in `package.json`:
```bash
npm install
```

### 3. Start the Development Server

Launch the application in development mode:
```bash
npm run dev
```
The application will be available at `http://localhost:5173` (or the port specified in your terminal).

### 4. Build for Production

To create a production-ready build for deployment:
```bash
npm run build
```
This will generate optimized, minified static files in the `dist` directory. You can preview the build locally using `npm run preview`.

## 📂 Project Structure

- `src/components/`: Modular UI units and page components (`HomePage`, `LoginPage`, `UserDashboard`, `AuthorityDashboard`, etc.).
- `src/store/`: Global state management powered by Zustand, handling active sessions and the property ledger.
- `src/utils/`: Core algorithmic utilities:
  - `crypto.ts`: Cryptographic hashing and key management.
  - `geo.ts`: Geospatial processing algorithms.
  - `riskEngine.ts`: Calculates property and transaction risk profiles.
- `src/types/`: TypeScript interface definitions ensuring end-to-end type safety.
- `src/App.tsx`: Main routing and layout wrapper.
- `vite.config.ts`: Configuration for the Vite bundler.
