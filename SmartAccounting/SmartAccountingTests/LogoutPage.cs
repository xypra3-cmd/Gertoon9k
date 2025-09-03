using Microsoft.Playwright;

namespace SmartAccountingTests.Pages
{
    public class LogoutPage
    {
        private readonly IPage _page;
        public LogoutPage(IPage page) => _page = page;

        public async Task Logout()
        {
            await _page.GetByRole(AriaRole.Menuitem, new() { Name = "Гарах" }).ClickAsync();
        }
    }
}
