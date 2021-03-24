module.exports = [
  {
    name: "Recruiting Contractors",
    dn:
      "CN=Recruiting_Contractors,OU=Distribution Groups,OU=glgroup groups,DC=glgroup,DC=com",
    type: "activeDirectory",
    masks: [
      {
        claim: "role-contractors",
        mask: 1,
      },
    ],
    unmasks: [
      {
        claim: "af",
        mask: 33,
      },
      {
        claim: "role-glg",
        mask: 33,
      },
    ],
    description: "Hired contractors who are not GLG employees",
  },
  {
    name: "GLG Know",
    dn:
      "CN=services.glgresearch.com_know,OU=Application Security Groups,OU=Security Groups,OU=glgroup groups,DC=glgroup,DC=com",
    type: "activeDirectory",
    masks: [
      {
        claim: "role-applications",
        mask: 1,
      },
    ],
    description: "The group of people who can access GLG Know",
  },
  {
    name: "Deny All",
    masks: [
      {
        claim: "role-glg",
        mask: 0,
      },
    ],
    legacy: true,
    description: "Formerly GLG_DENY_ALL",
  },
  {
    name: "GLG Employees",
    masks: [
      {
        claim: "role-glg",
        mask: 1,
      },
    ],
    legacy: true,
    description: "Formerly GLG_USER",
  },
  {
    name: "Clients",
    masks: [
      {
        claim: "role-glg",
        mask: 2,
      },
    ],
    legacy: true,
    description: "Formerly GLG_CLIENT",
  },
  {
    name: "Council Members",
    masks: [
      {
        claim: "role-glg",
        mask: 4,
      },
    ],
    legacy: true,
    description: "Formerly GLG_COUNCILMEMBER",
  },
  {
    name: "Survey Respondent",
    masks: [
      {
        claim: "role-glg",
        mask: 8,
      },
    ],
    legacy: true,
    description: "Formerly GLG_SURVEYRESPONDENT",
  },
  {
    name: "External Applications",
    masks: [
      {
        claim: "role-glg",
        mask: 16,
      },
    ],
    legacy: true,
    description: "Formerly GLG_APP",
  },
  {
    name: "External Worker",
    masks: [
      {
        claim: "role-glg",
        mask: 32,
      },
    ],
    legacy: true,
    description: "Formerly GLG_EXTERNAL_WORKER",
  },
  {
    name: "Allow All",
    masks: [
      {
        claim: "role-glg",
        mask: 2147483647,
      },
    ],
    legacy: true,
    description: "Formerly GLG_ALLOW_ALL",
  },
];
