# EarnArena 👋


[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/Framework-React_Native-61DAFB?logo=react&logoColor=black)]()
[![License: Unlicensed](https://img.shields.io/badge/License-Unlicensed-red.svg)](./LICENSE)

## Description

EarnArena is a mobile gaming platform built with React Native and TypeScript that allows users to participate in various games and earn rewards. The application integrates with blockchain technologies via libraries such as `@reown/appkit-react-native` and `wagmi` to manage user wallets and transactions. It leverages Firebase for user authentication, data storage, and real-time updates. Key features include a game library, profile management, ranking dashboards, and wallet integration for reward payouts.

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [How to Use](#how-to-use)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Important Links](#important-links)
- [Footer](#footer)

## Features

- **Game Library**: Explore and play a variety of games, including quiz games, puzzle games, and card matching games. 🎮
- **User Authentication**: Secure user accounts managed with Firebase authentication. ✅
   - Supports creating new accounts and signing in with email and password.
   - Uses Firebase Firestore to store user profiles and game statistics.
- **Wallet Integration**: Connect and manage cryptocurrency wallets using `@reown/appkit-react-native` and `wagmi`. 💰
   - Supports sending transactions to a master wallet for game entry fees.
   - Enables receiving rewards in CELO tokens upon winning games.
- **Ranking Dashboard**: View global leaderboards and track personal game statistics. 🏆
   - Displays user rankings based on win rate and total wins.
   - Provides information on how to improve ranking.
- **Profile Management**: Customize user profiles with avatars and track game history. 👤
   - Allows users to edit their profile details such as full name, username, email, and phone number.
   - Stores user avatars in Firebase Storage.
- **Daily Challenges**: Participate in daily challenges to earn more rewards. 🗓️
- **Payment History**: Track payment history, including pending and completed transactions. 🧾

## Tech Stack

- **Primary Language**: TypeScript 🟦
- **Frameworks**: React Native, Next.js, Expo ⚛️
- **Blockchain Libraries**: `@reown/appkit-react-native`, `@reown/appkit-wagmi-react-native`, `wagmi`, `viem` 🔗
- **Database**: Firebase Firestore 🔥
- **UI Libraries**: `lucide-react-native`, `@expo/vector-icons` 🎨
- **Navigation**: `expo-router`, `@react-navigation/*` 🧭

## Installation

1.  **Clone the repository:**

   ```bash
   git clone https://github.com/samkeleN/EarnArenaV2
   cd EarnArenaV2
   ```

2.  **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3.  **Configure Firebase:**
    - Set up a Firebase project on the [Firebase Console](https://console.firebase.google.com/).
    - Add your Firebase configuration to `utils/FirebaseConfig.ts`.

    ```typescript
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID",
        measurementId: "YOUR_MEASUREMENT_ID"
    };
    ```

4.  **Set up environment variables:**
    - If necessary, configure environment variables for Celo Sepolia RPC and Explorer in `src/chains/celoChains.ts`.

    ```typescript
    export const celoSepolia: Chain = {
        // Chain id for Celo Sepolia should be provided via env if possible. Fallback to Alfajores id.
        id: Number(process.env.CELO_SEPOLIA_CHAIN_ID) || 11142220,
        name: 'Celo Sepolia Testnet',
        nativeCurrency: { name: 'Celo Sepolia Testnet', symbol: 'CELO', decimals: 18 },
        rpcUrls: {
            default: { http: [process.env.CELO_SEPOLIA_RPC || 'https://forno.celo-sepolia.celo-testnet.org'] },
            public: { http: [process.env.CELO_SEPOLIA_RPC || 'https://forno.celo-sepolia.celo-testnet.org'] },
        },
        blockExplorers: {
            default: { name: 'Celo Sepolia Explorer', url: process.env.CELO_SEPOLIA_EXPLORER || 'https://explorer.celo.org' },
        },
        testnet: true,
    };
    ```

## Usage

1.  **Start the application:**

   ```bash
   npm start
   # or
   yarn start
   ```

2.  **Run on specific platforms:**

   ```bash
   npm run android
   npm run ios
   npm run web
   ```

3.  **Connect Wallet**: Use the `AppKitButton` component (from `@reown/appkit-react-native`) on the landing page (`app/index.tsx`) to connect your wallet.

    ```typescript
    <AppKitButton connectStyle={styles.connectButton} label="Connect Wallet" />
    ```

4.  **Create an account or log in:**
    - If you are a new user, you will be redirected to the create account page (`app/auth/create-account.tsx`).
    - If you already have an account, you can log in on the login page (`app/auth/login.tsx`).

5.  **Explore Games**: Navigate the game library using the bottom tab navigation. The tab layout is configured in `app/(tabs)/_layout.tsx`.

6.  **Play Games and Earn Rewards**: Play games, win, and receive rewards directly to your connected wallet.


## Run for Testing (Expo Go)

> 🚧 *This app is currently available for testing via Expo Go.*  
> To try it out:

1. Install **Expo Go** on your mobile device (from Google Play Store or Apple App Store).  
2. Open the Expo Go app paste the following URL into Expo Go:   

```url 
exp://u.expo.dev/update/0c810fc6-f423-4569-995a-57ffcfddac84 
```

3. The app should load — you can then test the app features: wallet connection, games, authentication, etc.
4. Please use **Celo testnet** for best experience since at the moment since its still under development.

## How to Use

This application serves as a gaming platform where users can engage in various games and earn rewards. Here's how to use it:

1.  **Connect Your Wallet**: Use the connect wallet button on the landing page to link your cryptocurrency wallet.
2.  **Create an Account**: If you're a new user, create an account by providing a username, email, and password. Existing users can log in with their credentials.
3.  **Explore the Game Library**: Browse through the available games and select one to play. The games are categorized for easy navigation.
4.  **Participate in Games**: Pay the entry fee (if applicable) to start playing a game. The payment modal will guide you through the process.
5.  **Earn Rewards**: Win games to earn rewards, which are automatically credited to your connected wallet.
6.  **Track Your Progress**: Monitor your ranking and game statistics on the profile and ranking dashboards.

## Project Structure

```
EarnArenaV2/
├── app/
│   ├── (tabs)/                # Tab navigation layout and screens
│   │   ├── _layout.tsx        # Tab layout configuration
│   │   ├── games.tsx          # Game library screen
│   │   ├── index.tsx          # Home screen
│   │   ├── profile.tsx        # User profile screen
│   │   └── ranks.tsx          # Ranking dashboard screen
│   ├── auth/                # Authentication screens
│   │   ├── create-account.tsx  # Create account screen
│   │   └── login.tsx         # Login screen
│   ├── games/               # Individual game screens
│   │   ├── card-match.tsx    # Card matching game
│   │   ├── puzzle-game.tsx   # Puzzle game
│   │   └── quiz-game.tsx      # Quiz game
│   ├── _layout.tsx           # Root layout
│   └── index.tsx             # Landing page
├── components/            # Reusable components
├── constants/             # Constants
├── data/                  # Mock data
├── hooks/                 # Custom hooks
├── scripts/               # Utility scripts
├── src/                   # Source code
├── utils/                 # Utility functions
├── app.json               # App configuration
├── babel.config.js        # Babel configuration
├── eslint.config.js       # ESLint configuration
├── metro.config.js        # Metro bundler configuration
├── package.json           # Dependencies and scripts
├── README.md              # Project documentation
└── tsconfig.json          # TypeScript configuration
```

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository. 🍴
2.  Create a new branch for your feature or bug fix. 🌿
3.  Make your changes and commit them with clear, concise messages. ✍️
4.  Submit a pull request. 🚀

## License

This project is unlicensed.

## Important Links

- **GitHub Repository**: [EarnArenaV2](https://github.com/samkeleN/EarnArenaV2)

## Footer

- Repository Name: EarnArenaV2
- Repository URL: https://github.com/samkeleN/EarnArenaV2
- Author: samkeleN
- Contact: +27 63 3274 367

⭐ Like this project? Give it a star on [GitHub](https://github.com/samkeleN/EarnArenaV2)!

:fork_and_knife: Fork it to contribute and make it better!

:exclamation: Report any issues or suggestions [here](https://github.com/samkeleN/EarnArenaV2/issues).