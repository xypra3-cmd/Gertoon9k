using Microsoft.Playwright;

namespace SmartAccountingTests.Pages
{
    public class DashboardPage
    {
        private readonly IPage _page;
        public DashboardPage(IPage page) => _page = page;

        public async Task SelectCloud(string cloudName)
        {
            await _page.Locator("#slbasecomponent").GetByRole(AriaRole.Button, new() { Name = "Open or close the drop-down" }).ClickAsync();
            await _page.GetByRole(AriaRole.Option, new() { Name = cloudName }).ClickAsync();
            await _page.GetByRole(AriaRole.Button, new() { Name = "Хадгалах" }).ClickAsync();
        }

        public async Task SearchAndSelectUser(string userCode)
        {
            await _page.Locator("input[name^='id']").FillAsync(userCode);
            await _page.GetByRole(AriaRole.Button, new() { Name = "хайх" }).ClickAsync();
            await _page.GetByRole(AriaRole.Button, new() { Name = "Сонгох" }).ClickAsync();
        }
    }
}
