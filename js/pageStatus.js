
document.addEventListener('DOMContentLoaded', function()
{
	let persistence = new Persistence();

	persistence.init().then(()=>
	{
		persistence.database.getDatabaseResume().then((dbResume)=>
		{
			console.log( dbResume );
		});
	})
	.catch((error)=>
	{
		console.log( error );
	});
});
