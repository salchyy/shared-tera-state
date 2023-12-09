# shared-tera-state

Description

The SharedTeraState mod is a comprehensive tool for Tera players, providing detailed tracking and updates of various in-game states. It captures and shares information about player and boss positions, player statistics, NPC and monster locations, party member data, and more in real-time.

Features

    Player and Boss Tracking: Monitors and updates the player's and boss's positions, angles, and distances from each other.
    Player Stat Updates: Keeps track of player's stats like HP, MP, attack speed, and more.
    Monster Tracking: Records the locations and states of monsters and NPCs in the game.
    Party Member Data: Tracks party members' positions, health, and other relevant information.
    Damage and DPS Meter: Provides real-time updates on damage dealt and DPS calculations.
    Abnormality Tracking: Monitors status abnormalities on bosses and their durations.

Installation

    Place the mod files into the mods folder of your TeraProxy installation.

Usage

The mod operates automatically once loaded, capturing and updating various game states. It uses hooks to listen for specific game events and updates the global.sharedTeraState object with relevant data.

Core Functionalities

    Hooks various game packets to track player and boss positions, player statistics, and more.
    Provides real-time DPS calculations and displays them in-game.
    Keeps track of party members' stats and positions.
    Tracks abnormalities applied to bosses and their remaining durations.
