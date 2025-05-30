const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/resolve", async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes("terabox")) {
    return res.status(400).json({ error: "Invalid TeraBox link" });
  }

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait for video tag or script variable
    await page.waitForTimeout(5000);

    const directUrl = await page.evaluate(() => {
      const scripts = Array.from(document.scripts);
      for (const script of scripts) {
        const m = script.innerText.match(/"main_url":"(.*?)"/);
        if (m && m[1]) {
          return decodeURIComponent(m[1].replace(/\\u002F/g, "/"));
        }
      }
      return null;
    });

    await browser.close();

    if (directUrl) {
      res.json({ videoUrl: directUrl });
    } else {
      res.status(404).json({ error: "Direct video URL not found." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to extract video URL." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
