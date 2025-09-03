using NUnit.Framework;
using SmartAccountingTests.Pages;

namespace SmartAccountingTests
{
    public class LoginLogoutTests : TestBase
    {
        [Test]
        public async Task LoginAndLogoutTest()
        {
            var loginPage = new LoginPage(Page);
            await loginPage.Login("admin", "123");

            var dashboardPage = new DashboardPage(Page);
            await dashboardPage.SelectCloud("CloudTestingGanbat");
            await dashboardPage.SearchAndSelectUser("00026");

            var logoutPage = new LogoutPage(Page);
            await logoutPage.Logout();
        }
    }
}
