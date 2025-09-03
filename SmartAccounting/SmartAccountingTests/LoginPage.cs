using Microsoft.Playwright;

namespace SmartAccountingTests.Pages
{
    public class LoginPage
    {
        private readonly IPage _page;
        public LoginPage(IPage page) => _page = page;

        public async Task Login(string username, string password)
        {
            await _page.GotoAsync("https://accounting.smartlogic.mn/auth/login");
            await _page.GetByRole(AriaRole.Textbox, new() { Name = "Хэрэглэгч" }).FillAsync(username);
            await _page.GetByRole(AriaRole.Textbox, new() { Name = "Түлхүүр" }).FillAsync(password);
            await _page.GetByRole(AriaRole.Button, new() { Name = "Нэвтрэх" }).ClickAsync();
        }
    }
}
