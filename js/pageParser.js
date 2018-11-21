
document.addEventListener('DOMContentLoaded', function()
{

	var persistence = new Persistence();
	persistence.init();

	let client = new Client();


	Utils.getById('pageParserAgain').addEventListener('click',(evt)=>
	{
		Utils.stopEvent( evt );
		client.executeOnCurrentTab('ParseAgain',{});
	});

	Utils.getById('pageParserOptimizeStock').addEventListener('click',(evt)=>
	{
		Utils.stopEvent( evt );
		persistence.optimizeAllStock().then(()=>
		{
			console.log('End Optimization');
		})
		.catch((e)=>
		{
			console.log('Fails Stock Optimization', e );
		});
	});

	Utils.getById('pageParserOptimizeUrls').addEventListener('click',(evt)=>
	{
		Utils.stopEvent( evt );
		persistence.optimizeAllLinksUrls()
		.then((result)=>
		{
			console.log('End Optimization');
		})
		.catch((e)=>
		{
			console.log('Fails Urls Optimization', e );
		});
	});

	Utils.getById('pageParserExtractAllLinks').addEventListener('click',(evt)=>
	{
		Utils.stopEvent( evt );
		client.executeOnCurrentTab("ExtractAllLinks",{});
	});
});
