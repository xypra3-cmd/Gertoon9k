using Microsoft.Playwright;
using NUnit.Framework;
using Xceed.Words.NET;

namespace SmartAccountingTests
{
    public class TestBase
    {
        protected IPage Page;
        protected IBrowser Browser;
        protected IBrowserContext Context;

        [SetUp]
        public async Task Setup()
        {
            var playwright = await Playwright.CreateAsync();
            Browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
            {
                Headless = false
            });
            Context = await Browser.NewContextAsync();
            Page = await Context.NewPageAsync();
        }

        [TearDown]
        public async Task TearDown()
        {
            var testName = TestContext.CurrentContext.Test.Name;
            var testStatus = TestContext.CurrentContext.Result.Outcome.Status;

            var screenshotsDir = Path.Combine(Directory.GetCurrentDirectory(), "Screenshots");
            if (!Directory.Exists(screenshotsDir))
                Directory.CreateDirectory(screenshotsDir);

            // Screenshot хадгалах
            var screenshotPath = $"Screenshots\\{testName}.png";
            Directory.CreateDirectory("Screenshots");
            await Page.ScreenshotAsync(new PageScreenshotOptions { Path = screenshotPath });

            // Word тайланд бичих
            var reportPath = "TestReport.docx";
            var doc = File.Exists(reportPath) ? DocX.Load(reportPath) : DocX.Create(reportPath);
            doc.InsertParagraph($"{DateTime.Now:yyyy-MM-dd HH:mm:ss} | {testName} | Status: {testStatus}");
            doc.InsertParagraph().AppendPicture(doc.AddImage(screenshotPath).CreatePicture());
            doc.InsertParagraph(); // хоосон мөр
            doc.Save();

            await Browser.CloseAsync();
        }
    }
}
