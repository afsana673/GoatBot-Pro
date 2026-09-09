module.exports = {
	config: {
		name: "startup",
		version: "1.0",
		author: "Israfil",
		countDown: 0,
		role: 0,
		description: {
			en: "Bot startup announcement - runs automatically when bot starts"
		},
		category: "system",
		guide: {
			en: "Runs automatically - no command needed"
		}
	},

	onLoad: async function ({ api, threadsData }) {
		try {
			// Get all groups/threads where bot is active
			const allThreads = await threadsData.getAll();
			
			const startupMessage = `
🤖 BOT IS ONLINE! 🤖

━━━━━━━━━━━━━━━━━━━━━
✅ Status: ACTIVE
⚡ Power: 100%
🔧 All systems: OPERATIONAL
💫 Ready to serve you!

━━━━━━━━━━━━━━━━━━━━━

🎊 Welcome! The bot is now running
Type .help to see all commands
		`;

			// Send startup message to all groups
			if (allThreads && allThreads.length > 0) {
				for (const thread of allThreads) {
					try {
						await api.sendMessage(startupMessage, thread.threadID);
						// Small delay to avoid rate limiting
						await new Promise(resolve => setTimeout(resolve, 500));
					} catch (err) {
						console.error(`Failed to send startup message to thread ${thread.threadID}:`, err.message);
					}
				}
			}

			console.log("✅ Bot startup announcement sent to all groups!");

		} catch (err) {
			console.error("Startup command error:", err.message);
		}
	}
};
