module.exports = {
  config: {
    name: "kick",
    version: "1.3",
    author: "SK HABIBULLA",
    countDown: 5,
    role: 1, // 1 = শুধু অ্যাডমিন ব্যবহার করতে পারবে
    description: {
      en: "Kick a member from the group"
    },
    category: "box chat",
    guide: {
      en: "{pn} @tag\n{pn} reply\n{pn} uid"
    }
  },

  onStart: async function ({ message, event, args, api, usersData }) {
    const { threadID, senderID, messageReply, mentions } = event;

    // Bot অ্যাডমিন কিনা চেক
    const threadInfo = await api.getThreadInfo(threadID);
    const botID = api.getCurrentUserID();

    if (!threadInfo.adminIDs.some(item => item.id == botID)) {
      return message.reply("❌ বটকে অ্যাডমিন বানাতে হবে কিক করার জন্য।");
    }

    let uid;

    // ১. রিপ্লাই দিয়ে কিক
    if (messageReply) {
      uid = messageReply.senderID;
    }
    // ২. ট্যাগ করে কিক
    else if (Object.keys(mentions).length > 0) {
      uid = Object.keys(mentions)[0];
    }
    // ৩. UID দিয়ে কিক
    else if (args[0] && !isNaN(args[0])) {
      uid = args[0];
    }
    else {
      return message.reply("⚠️ কাউকে ট্যাগ করো, রিপ্লাই দাও অথবা UID দাও।");
    }

    // নিজেকে বা বটকে কিক করা যাবে না
    if (uid == senderID) {
      return message.reply("❌ নিজেকে কিক করতে পারবে না।");
    }
    if (uid == botID) {
      return message.reply("❌ আমাকে কিক করতে পারবে না।");
    }

    // গ্রুপ অ্যাডমিনকে কিক করা যাবে না
    if (threadInfo.adminIDs.some(item => item.id == uid)) {
      return message.reply("❌ গ্রুপ অ্যাডমিনকে কিক করা যাবে না।");
    }

    try {
      const name = await usersData.getName(uid) || "User";
      await api.removeUserFromGroup(uid, threadID);
      message.reply(`✅ ${name} কে সফলভাবে কিক করা হয়েছে।`);
    } catch (err) {
      message.reply(`❌ কিক করতে ব্যর্থ।\nError: ${err.errorDescription || err.message}`);
    }
  },

  // ============ React to Kick (🦶) ============
  onReaction: async function ({ message, event, api, Reaction, usersData }) {
    const { threadID, userID, reaction } = event;
    const { author } = Reaction; // যার মেসেজে রিয়েক্ট করা হয়েছে

    // শুধু 🦶 রিয়েক্টে কাজ করবে
    if (reaction !== "🦶") return;

    // শুধু adminBot-রা রিয়েক্ট করে কিক করতে পারবে
    const adminBot = global.GoatBot.config.adminBot || [];
    if (!adminBot.includes(userID)) return;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const botID = api.getCurrentUserID();

      // বট অ্যাডমিন কিনা
      if (!threadInfo.adminIDs.some(item => item.id == botID)) return;

      // গ্রুপ অ্যাডমিনকে কিক করা যাবে না
      if (threadInfo.adminIDs.some(item => item.id == author)) return;

      // নিজেকে বা বটকে কিক করা যাবে না
      if (author == userID || author == botID) return;

      const name = await usersData.getName(author) || "User";
      await api.removeUserFromGroup(author, threadID);

      api.sendMessage(`🦶 ${name} কে রিয়েক্ট করে কিক করা হয়েছে।`, threadID);
    } catch (err) {
      console.error("ReactKick Error:", err);
    }
  }
};
