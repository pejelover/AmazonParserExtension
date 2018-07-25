
document.addEventListener('DOMContentLoaded', function()
{

	var ext = new Client();

	chrome.windows.getCurrent((w)=>
	{
		ext.executeOnBackground('RegisterWindow', { window_id : w.id	});
	});
});
