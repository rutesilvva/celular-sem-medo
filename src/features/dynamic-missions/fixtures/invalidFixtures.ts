export const invalidMissionFixtures={
  unknownVersion:{schemaVersion:'99.0'},
  unknownComponent:{schemaVersion:'1.0',id:'bad-component',title:'Inválida',description:'Teste local.',category:'Teste',difficulty:'easy',estimatedDuration:1,safetyLevel:'standard',initialStepId:'one',steps:[{id:'one',components:[{id:'remote',type:'RemoteComponent'}],actions:[]}]},
  unknownAction:{schemaVersion:'1.0',id:'bad-action',title:'Inválida',description:'Teste local.',category:'Teste',difficulty:'easy',estimatedDuration:1,safetyLevel:'standard',initialStepId:'one',steps:[{id:'one',components:[],actions:[{id:'run',type:'executeCode'}]}]},
  forbiddenUrl:{schemaVersion:'1.0',id:'bad-url',title:'Inválida',description:'Abra https://example.com',category:'Teste',difficulty:'easy',estimatedDuration:1,safetyLevel:'standard',initialStepId:'one',steps:[{id:'one',components:[],actions:[]}]},
  forbiddenCredential:{schemaVersion:'1.0',id:'bad-password',title:'Inválida',description:'Digite sua senha real',category:'Teste',difficulty:'easy',estimatedDuration:1,safetyLevel:'standard',initialStepId:'one',steps:[{id:'one',components:[],actions:[]}]},
} as const;
