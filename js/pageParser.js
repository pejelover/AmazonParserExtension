
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
		persistence.optimizeAllStock();
	});

	Utils.getById('pageParserOptimizeUrls').addEventListener('click',(evt)=>
	{
		Utils.stopEvent( evt );
		persistence.optimizeAllUrl();
	});

	Utils.getById('pageParserExtractAllLinks').addEventListener('click',(evt)=>
	{
		Utils.stopEvent( evt );
		client.executeOnCurrentTab("ExtractAllLinks",{});
	});
});
