const { chromium } = require("playwright");

const checkMobileCompatibility = async (browser, link, pathname = "") => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.77 Mobile Safari/537.36",
  });
  const page = await context.newPage();
  await page.goto(`https://${link}/${pathname}`);
  const isMobileResponsive = await page.evaluate(() => {
    return window.innerWidth === 375;
  });
  await context.close();
  return isMobileResponsive;
};

const getPlatformData = async (link, pathname = "") => {
  try {
    console.log("🚀 ~ getPlatformData ~ link:", link);
    console.log("🚀 ~ getPlatformData ~ pathname:", pathname);

    // Tarayıcı başlat
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Hedef siteye git ve dinamik içeriği bekle
    await page.goto(`https://${link}/${pathname}`, {
      waitUntil: "networkidle",
    });

    const title = await page.title();

    // Sayfadaki tüm metni al
    const dynamicContent = await page.evaluate(() => {
      return document.body.innerText.trim();
    });

    // // Sayfa başlığını ve dinamik içeriği al
    // const title = await page.title();
    // const dynamicContent = await page.textContent("body");

    // Performans zamanlamalarını al
    const performanceTiming = await page.evaluate(() => {
      const [navigationTiming] = performance.getEntriesByType("navigation");
      return navigationTiming ? navigationTiming.toJSON() : null;
    });

    // Tüm meta etiketleri al
    const metaTags = await page.$$eval("meta", (metas) =>
      metas.map((meta) => ({
        name: meta.getAttribute("name"),
        content: meta.getAttribute("content"),
      }))
    );

    // Tüm linkleri al
    const links = await page.$$eval("a", (anchors) =>
      anchors.map((anchor) => anchor.href)
    );

    // Tüm resim URL'lerini al
    const images = await page.$$eval("img", (imgs) =>
      imgs.map((img) => img.src)
    );

    // Çerezleri al
    const cookies = await page.context().cookies();

    // Yerel depolama verilerini al
    const localStorageData = await page.evaluate(() =>
      Object.entries(localStorage).map(([key, value]) => ({ key, value }))
    );

    // Sayfada aşağı kaydır
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Kaydırma yüzdesi
    const scrollPercentage = await page.evaluate(() => {
      return (
        ((window.scrollY + window.innerHeight) / document.body.scrollHeight) *
        100
      );
    });

    // Kampanya verilerini al
    const urlParams = new URLSearchParams(page.url());
    const campaignData = {
      source: urlParams.get("utm_source"),
      medium: urlParams.get("utm_medium"),
      campaign: urlParams.get("utm_campaign"),
    };

    //CSS ve JS Dosyaları: Sayfanın stil dosyalarını ve harici JavaScript kaynaklarını alabilirsiniz
    const scripts = await page.$$eval("script", (scriptTags) =>
      scriptTags.map((script) => script.src || "inline")
    );
    const stylesheets = await page.$$eval("link[rel='stylesheet']", (links) =>
      links.map((link) => link.href)
    );

    //Özel Veri-Attributeleri: Sayfa içindeki data-* özelliklerini toplayabilirsiniz:
    const dataAttributes = await page.$$eval("*", (elements) =>
      elements.map((el) =>
        Array.from(el.attributes)
          .filter((attr) => attr.name.startsWith("data-"))
          .map((attr) => ({ [attr.name]: attr.value }))
      )
    );
   
    //Tıklanabilir Elemanlar: Tüm buton ve tıklanabilir elemanları alabilirsiniz
    const clickableElements = await page.$$eval(
      "a, button, [onclick]",
      (elements) =>
        elements.map((el) => ({
          tag: el.tagName,
          text: el.innerText.trim(),
          href: el.href || null,
        }))
    );

   

    //Form Elemanları: Sayfadaki tüm form girişlerini ve seçeneklerini toplayabilirsiniz:

    const formElements = await page.$$eval(
      "input, select, textarea",
      (inputs) =>
        inputs.map((input) => ({
          type: input.type,
          name: input.name,
          value: input.value,
          placeholder: input.placeholder,
        }))
    );

    


   

    page.on("requestfinished", async (request) => {
      if (request.url().includes("api")) {
        
        const response = await request.response();
       
      }
    });

    // Mevcut tarayıcı nesnesini kullanarak yeni bir mobil bağlam oluştur
    // const isMobileCompatible = await checkMobileCompatibility(
    //   browser,
    //   link,
    //   pathname
    // );
  

    // const hasViewportMeta = await page.evaluate(() => {
    //   const meta = document.querySelector("meta[name='viewport']");
    //   return (
    //     meta && meta.getAttribute("content").includes("width=device-width")
    //   );
    // });
  
    // const mediaQueries = await page.evaluate(() => {
    //   const styles = Array.from(document?.styleSheets);
    //   return styles.some((sheet) =>
    //     Array.from(sheet?.cssRules || []).some(
    //       (rule) => rule?.media && rule?.media?.mediaText.includes("max-width")
    //     )
    //   );
    // });
 
    // const hasOverflow = await page.evaluate(() => {
    //   return document.body.scrollWidth > window.innerWidth;
    // });


    // Fare Hareketleri ve Tıklamalar
    await page.exposeFunction("logMouseMove", (event) => {
      //console.log(
      //   "🚀 ~ Mouse Hareketi: X:",
      //   event.clientX,
      //   "Y:",
      //   event.clientY
      // );
    });
    await page.evaluate(() => {
      document.addEventListener("mousemove", (e) => window.logMouseMove(e));
    });

    // Scroll Davranışı
    const scrollBehavior = await page.evaluate(() => {
      return {
        totalHeight: document.body.scrollHeight,
        visibleHeight: window.innerHeight,
        scrollY: window.scrollY,
      };
    });
    //console.log("🚀 ~ Scroll Davranışı:", scrollBehavior);

    // Form Tamamlama Oranı
    const formCompletion = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll("input, textarea, select")
      );
      return inputs.map((input) => ({
        name: input.name || input.id,
        value: input.value,
        completed: !!input.value,
      }));
    });
    //console.log("🚀 ~ Form Tamamlama Oranı:", formCompletion);



    // Sayfa Başlıkları (H1, H2, H3)
    const pageHeadings = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("h1, h2, h3")).map(
        (el) => el.innerText
      );
    });
    //console.log("🚀 ~ Sayfa Başlıkları:", pageHeadings);





    // Etkileşim Verileri (Hover Olayları)
    await page.evaluate(() => {
      document.addEventListener("mouseover", (e) => {
        //console.log("🚀 ~ Hovered Eleman:", e.target.tagName);
      });
    });
    const result = {
      link,
      pathname,
      title,
      dynamicContent,
      performanceTiming,
      metaTags,
      links,
      images,
      cookies,
      localStorageData,
      scrollPercentage: scrollPercentage.toFixed(2),
      campaignData,
      scripts, // Sayfa içindeki JavaScript dosyaları
      stylesheets, // Sayfa içindeki CSS dosyaları
      dataAttributes, // data-* özellikleri
      clickableElements, // Tıklanabilir elemanlar
      formElements, // Form elemanları
     
      // isMobileCompatible, // Mobil uyumluluk bilgisi
      // hasViewportMeta, // Viewport meta etiketi var mı
      // mediaQueries, // Medya sorguları var mı
      // hasOverflow, // Taşma problemi var mı
    };

    // Tarayıcıyı kapat
    await browser.close();

    console.log("🚀 ~ getPlatformData ~ link:", link);
    console.log("🚀 ~ getPlatformData ~ pathname:", pathname);
    // Verileri döndür
    return result;
  } catch (error) {
    console.error("🚀 ~ getPlatformData ~ error:", error);

    throw error; // Hatanın üst seviyeye iletilmesini sağlar
  }
};

module.exports = getPlatformData;
