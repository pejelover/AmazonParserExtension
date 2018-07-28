
document.addEventListener('DOMContentLoaded', function()
{
	//var ext = new Client();
	let persistence = new Persistence();

	chrome.windows.getCurrent((w)=>
	{
		//ext.executeOnBackground('RegisterWindow', { window_id : w.id	});
	});

	document.getElementById('downloadButton').addEventListener('click',(evt)=>
	{
		persistence.getProductList().then((products)=>
		{
			let s = persistence.generateRawReport( products );
			download('something.csv',s );
		});
	});

	function download(filename, text)
	{
		var element = document.createElement('a');
		element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(text));
		element.setAttribute('download', filename);
		element.style.display = 'none';

		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	}
});
