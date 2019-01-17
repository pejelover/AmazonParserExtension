import Persistence from './Persistence.js';
import Utils from './Diabetes/Util.js';

document.addEventListener('DOMContentLoaded', function()
{
	let persistence = new Persistence();

	persistence.init().then(()=>
	{
		persistence.database.getDatabaseResume().then((dbResume)=>
		{
			console.log( dbResume );
			let s = '<ul>';

			dbResume.forEach((store)=>
			{
				s += `<li>${store.name} ${store.total} </li>`;

				if( store.indexes.length )
				{
					s+='<ul>';
					store.indexes.forEach((index)=>
					{
						s += `<li>${index.name} ${ index.count } </li>`;
					});
					s+='</ul>';
				}
			});
			s+='</ul>';
			Utils.getById('pageStatusContainer').innerHTML = s;
		});
	})
	.catch((error)=>
	{
		console.log( error );
	});
});
