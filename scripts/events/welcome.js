const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

module.exports.config = {
	name: "welcome",
	eventType: ["log:subscribe"],
	version: "1.4",
	credits: "Claude",
	description: "Send a custom welcome card when a new member joins the group"
};

// helper: draw rounded rectangle
function roundRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

async function getAvatarUrl(userID) {
	return `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
}

module.exports.run = async function ({ api, event }) {
	const { threadID, logMessageData, author } = event;

	// only handle when someone is added (not when someone leaves)
	if (!logMessageData || !logMessageData.addedParticipants) return;

	const addedParticipants = logMessageData.addedParticipants;

	for (const user of addedParticipants) {
		// skip if the bot itself was added
		if (user.userFbId == api.getCurrentUserID()) continue;

		try {
			const threadInfo = await api.getThreadInfo(threadID);
			const memberCount = threadInfo.participantIDs.length;
			const groupName = threadInfo.threadName || "This Group";

			const addedByInfo = await api.getUserInfo(author).catch(() => null);
			const addedByName = (addedByInfo && addedByInfo[author] && addedByInfo[author].name) || "Admin";

			const width = 800, height = 500;
			const canvas = createCanvas(width, height);
			const ctx = canvas.getContext("2d");

			// background: midnight ocean deep blue gradient
			const bgGradient = ctx.createLinearGradient(0, 0, width, height);
			bgGradient.addColorStop(0, "#041b33");
			bgGradient.addColorStop(0.5, "#0a2540");
			bgGradient.addColorStop(1, "#083358");
			ctx.fillStyle = bgGradient;
			roundRect(ctx, 0, 0, width, height, 30);
			ctx.fill();

			// decorative glow blobs (clipped to the rounded card)
			ctx.save();
			roundRect(ctx, 0, 0, width, height, 30);
			ctx.clip();
			const glow1 = ctx.createRadialGradient(width - 60, 40, 0, width - 60, 40, 220);
			glow1.addColorStop(0, "rgba(133,183,235,0.22)");
			glow1.addColorStop(1, "rgba(133,183,235,0)");
			ctx.fillStyle = glow1;
			ctx.fillRect(0, 0, width, height);

			const glow2 = ctx.createRadialGradient(60, height - 40, 0, 60, height - 40, 220);
			glow2.addColorStop(0, "rgba(159,225,203,0.15)");
			glow2.addColorStop(1, "rgba(159,225,203,0)");
			ctx.fillStyle = glow2;
			ctx.fillRect(0, 0, width, height);
			ctx.restore();

			// header text
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 34px Sans";
			ctx.fillText(`Welcome ${user.fullName} 🎉`, 40, 60);

			const headerLine = ctx.createLinearGradient(40, 0, width - 40, 0);
			headerLine.addColorStop(0, "#378add");
			headerLine.addColorStop(1, "#85b7eb");
			ctx.strokeStyle = headerLine;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(40, 85);
			ctx.lineTo(width - 40, 85);
			ctx.stroke();
			ctx.lineWidth = 1;

			ctx.font = "22px Sans";
			ctx.fillStyle = "#c6ddf2";
			ctx.fillText("✦ Glad to have you here! Enjoy your stay", 40, 130);
			ctx.fillText("and make great memories 🌊", 40, 160);

			// left panel: avatar circle with gradient ring + soft glow
			const avatarUrl = await getAvatarUrl(user.userFbId);
			let avatarImg;
			try {
				const res = await axios.get(avatarUrl, { responseType: "arraybuffer" });
				avatarImg = await loadImage(Buffer.from(res.data, "binary"));
			} catch (e) {
				avatarImg = null;
			}

			const cx = 190, cy = 300, r = 100;

			ctx.save();
			ctx.shadowColor = "rgba(133,183,235,0.55)";
			ctx.shadowBlur = 30;
			ctx.beginPath();
			ctx.arc(cx, cy, r + 4, 0, Math.PI * 2, true);
			ctx.strokeStyle = "rgba(133,183,235,0.4)";
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.restore();

			ctx.save();
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
			ctx.closePath();
			const ringGradient = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
			ringGradient.addColorStop(0, "#378add");
			ringGradient.addColorStop(1, "#85b7eb");
			ctx.lineWidth = 6;
			ctx.strokeStyle = ringGradient;
			ctx.stroke();
			ctx.clip();
			if (avatarImg) {
				ctx.drawImage(avatarImg, cx - r, cy - r, r * 2, r * 2);
			} else {
				// fixed fallback: solid fill + initial letter so the circle is never blank
				ctx.fillStyle = "#0a2540";
				ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
				ctx.fillStyle = "#85b7eb";
				ctx.font = "bold 70px Sans";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText((user.fullName || "?").charAt(0).toUpperCase(), cx, cy);
				ctx.textBaseline = "alphabetic";
			}
			ctx.restore();

			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 26px Sans";
			ctx.textAlign = "center";
			ctx.fillText(user.fullName, cx, cy + 150);

			// pill badge for member count
			const badgeText = `• ${memberCount}${nth(memberCount)} Member •`;
			ctx.font = "18px Sans";
			const badgeWidth = ctx.measureText(badgeText).width + 40;
			roundRect(ctx, cx - badgeWidth / 2, cy + 165, badgeWidth, 34, 17);
			ctx.fillStyle = "rgba(133,183,235,0.15)";
			ctx.fill();
			ctx.fillStyle = "#85b7eb";
			ctx.fillText(badgeText, cx, cy + 189);
			ctx.textAlign = "left";

			// right panel: group info
			ctx.fillStyle = "#7fa8c9";
			ctx.font = "16px Sans";
			ctx.fillText("GROUP", 430, 250);

			ctx.fillStyle = "#9fe1cb";
			ctx.font = "bold 22px Sans";
			wrapText(ctx, groupName, 430, 285, 340, 26);

			ctx.fillStyle = "#7fa8c9";
			ctx.font = "16px Sans";
			ctx.fillText("ADDED BY", 430, 380);

			ctx.fillStyle = "#b5d4f4";
			ctx.font = "bold 20px Sans";
			ctx.fillText(addedByName, 430, 410);

			ctx.fillStyle = "#4a6b8a";
			ctx.font = "14px Sans";
			ctx.textAlign = "center";
			ctx.fillText("Powered By HR HABIB", width / 2, height - 30);
			ctx.textAlign = "left";

			const cacheDir = path.join(__dirname, "cache");
			if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
			const imgPath = path.join(cacheDir, `welcome_${user.userFbId}.png`);
			fs.writeFileSync(imgPath, canvas.toBuffer());

			const msgBody =
				`👋 Welcome ${user.fullName}!\n` +
				`You are our ${memberCount}${nth(memberCount)} member.\n` +
				`Added by: ${addedByName}\n` +
				`Enjoy your stay and make great memories 🌸`;

			await api.sendMessage(
				{
					body: msgBody,
					attachment: fs.createReadStream(imgPath)
				},
				threadID
			);

			// cleanup
			fs.unlink(imgPath, () => {});
		} catch (err) {
			console.log("welcome.js error:", err.message);
			// fallback plain text welcome if image generation fails
			api.sendMessage(`👋 Welcome ${user.fullName} to the group! 🎉`, threadID);
		}
	}
};

function nth(n) {
	if (n % 100 >= 11 && n % 100 <= 13) return "th";
	switch (n % 10) {
		case 1: return "st";
		case 2: return "nd";
		case 3: return "rd";
		default: return "th";
	}
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
	const words = text.split(" ");
	let line = "";
	let curY = y;
	for (let n = 0; n < words.length; n++) {
		const testLine = line + words[n] + " ";
		const metrics = ctx.measureText(testLine);
		if (metrics.width > maxWidth && n > 0) {
			ctx.fillText(line, x, curY);
			line = words[n] + " ";
			curY += lineHeight;
		} else {
			line = testLine;
		}
	}
	ctx.fillText(line, x, curY);
}
