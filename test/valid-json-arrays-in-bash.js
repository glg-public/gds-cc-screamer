const { expect } = require("chai");
const validJsonArrayInBashCheck = require("../checks/valid-json-arrays-in-bash");

["CMD", "ENTRYPOINT"].map(varName => {
  describe(`Valid JSON Arrays in Bash Checker - ${varName}`, async () => {
    it("skips if therea is no orders file", async () => {
      const deployment = {
        serviceName: "streamliner"
      };

      const results = await validJsonArrayInBashCheck(deployment);
      expect(results.length).to.equal(0);
    });

    it(`ignores variables not named ${varName}`, async () => {
      const result = await validJsonArrayInBashCheck({
        serviceName: "catpants",
        ordersPath: "catpants/orders",
        ordersContents: [
          `export NOT${varName}=\'["npm", "run", "start\'`
        ],
      });

      expect(result).to.have.lengthOf(0);
    });

    it(`accepts valid arrays in ${varName} bash variables`, async () => {
      const result = await validJsonArrayInBashCheck({
        serviceName: "catpants",
        ordersPath: "catpants/orders",
        ordersContents: [
          `export ${varName}=\'["npm", "run", "start"]\'`
        ],
      });

      expect(result).to.have.lengthOf(0);
    });

    it(`rejects invalid JSON in ${varName} bash variables`, async () => {
      const results = await validJsonArrayInBashCheck({
        serviceName: "catpants",
        ordersPath: "catpants/orders",
        ordersContents: [
          `export ${varName}=\'["npm", "run", "start]\'`
        ],
      });

      expect(results.length).to.equal(1);
      expect(results[0].problems[0]).to.equal(
        `The contents of the ${varName} variable must contain valid stringified JSON.`
      );

    });

    it(`rejects invalid JSON array in ${varName} bash variables`, async () => {
      const results = await validJsonArrayInBashCheck({
        serviceName: "catpants",
        ordersPath: "catpants/orders",
        ordersContents: [
          `export ${varName}=\'"npm start"\'`
        ],
      });

      expect(results.length).to.equal(1);
      expect(results[0].problems[0]).to.equal(
        `The contents of the ${varName} variable must contain a valid JSON Array.\n\`\`\`suggestion
export ${varName}='["npm","start"]'
\`\`\``
      );

    });

  });
});
